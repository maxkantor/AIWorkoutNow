using AIWorkoutNow.Api.Models;
using Amazon.SimpleSystemsManagement;
using Amazon.SimpleSystemsManagement.Model;
using System.Text;
using System.Text.Json;

namespace AIWorkoutNow.Api.Services;

public class OpenAIService : IAIService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public OpenAIService()
    {
        _httpClient = new HttpClient();
        // Get API key from SSM Parameter Store
        _apiKey = GetSSMParameter("/aiworkoutnow/openai-api-key").Result;
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
    }

    private async Task<string> GetSSMParameter(string parameterName)
    {
        try
        {
            using var ssmClient = new AmazonSimpleSystemsManagementClient();
            var request = new GetParameterRequest
            {
                Name = parameterName,
                WithDecryption = true
            };
            var response = await ssmClient.GetParameterAsync(request);
            return response.Parameter.Value;
        }
        catch
        {
            // Fallback to environment variable for local development
            return Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? throw new Exception("OpenAI API key not found");
        }
    }

    public async Task<Workout> GenerateWorkoutAsync(WorkoutPreferences preferences)
    {
        var prompt = BuildPrompt(preferences);
        var languageName = GetLanguageName(preferences.Lang);
        
        var requestBody = new
        {
            model = "gpt-4o-mini",
            messages = new[]
            {
                new
                {
                    role = "system",
                    content =
                        $"You are a professional fitness trainer and workout planner. " +
                        $"Return ONLY valid JSON (no markdown, no extra text). " +
                        $"All human-readable strings MUST be in {languageName}. Do NOT use English unless the language is English. " +
                        $"No medical claims. Include a brief safety disclaimer inside the description field. " +
                        $"Do not add extra keys beyond the requested JSON shape."
                },
                new { role = "user", content = prompt }
            },
            response_format = new { type = "json_object" },
            temperature = 0.7
        };

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);
        
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            throw new Exception($"OpenAI API error: {response.StatusCode} - {errorContent}");
        }

        var responseJson = await response.Content.ReadAsStringAsync();
        var openAiResponse = JsonSerializer.Deserialize<OpenAIResponse>(responseJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (openAiResponse?.Choices == null || openAiResponse.Choices.Length == 0)
            throw new Exception($"Invalid response from OpenAI: {responseJson}");

        var messageContent = openAiResponse.Choices[0].Message?.Content;
        if (string.IsNullOrEmpty(messageContent))
            throw new Exception($"Empty content in OpenAI response: {responseJson}");

        // Parse JSON response
        var workout = JsonSerializer.Deserialize<Workout>(messageContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (workout == null)
            throw new Exception("Failed to parse AI response");

        // Parse product recommendations if present (they come as raw JSON from AI)
        if (workout.ProductRecommendations == null || workout.ProductRecommendations.Count == 0)
        {
            // Try to extract productRecommendations from the raw JSON
            try
            {
                var jsonDoc = JsonDocument.Parse(messageContent);
                if (jsonDoc.RootElement.TryGetProperty("productRecommendations", out var productsElement))
                {
                    var products = JsonSerializer.Deserialize<List<ProductRecommendation>>(
                        productsElement.GetRawText(),
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                    );
                    workout.ProductRecommendations = products;
                }
            }
            catch
            {
                // If parsing fails, just continue without product recommendations
                workout.ProductRecommendations = new List<ProductRecommendation>();
            }
        }

        // Generate hash for workout
        workout.Hash = GenerateWorkoutHash(workout);
        workout.WorkoutId = Guid.NewGuid().ToString();
        workout.CreatedAt = DateTime.UtcNow;

        return workout;
    }

    private string BuildPrompt(WorkoutPreferences preferences)
    {
        var languageName = GetLanguageName(preferences.Lang);
        return $@"Generate a personalized workout plan with the following specifications:

Language: {languageName}

Fitness Level: {preferences.FitnessLevel}
Workout Type: {preferences.WorkoutType}
Duration: {preferences.Duration} minutes
Equipment Available: {preferences.Equipment}
Injuries/Limitations: {(preferences.Injuries.Any() ? string.Join(", ", preferences.Injuries) : "None")}
Goals: {(preferences.Goals.Any() ? string.Join(", ", preferences.Goals) : "General fitness")}

Please provide a JSON response with the following structure:
{{
  ""title"": ""Workout title"",
  ""description"": ""Brief description (include a short safety disclaimer here)"",
  ""type"": ""{preferences.WorkoutType}"",
  ""exercises"": [
    {{
      ""name"": ""Exercise name"",
      ""sets"": 3,
      ""reps"": 12,
      ""instructions"": ""How to perform"",
      ""rest"": ""60 seconds""
    }}
  ],
  ""tips"": [""Tip 1"", ""Tip 2""],
  ""productRecommendations"": [
    {{
      ""category"": ""Product category (e.g., Dumbbells, Resistance Bands, Yoga Mat)"",
      ""searchKeywords"": ""Amazon search keywords (e.g., adjustable dumbbells set)"",
      ""title"": ""Product title"",
      ""description"": ""Why this product is recommended for this workout"",
      ""reason"": ""Specific reason this product helps with this workout""
    }}
  ]
}}

For productRecommendations, suggest 2-4 relevant fitness products that would enhance this workout. Base recommendations on the workout type, equipment available, and exercises included. Use specific, searchable keywords that users would use on Amazon.

Make sure the workout is safe, effective, and appropriate for the specified fitness level and equipment available.";
    }

    private static string GetLanguageName(string? lang)
    {
        var l = (lang ?? "en").Trim().ToLowerInvariant();
        return l switch
        {
            "es" => "Spanish",
            "ru" => "Russian",
            "hi" => "Hindi",
            "zh" => "Chinese (Simplified)",
            _ => "English"
        };
    }

    private string GenerateWorkoutHash(Workout workout)
    {
        var content = $"{workout.Type}-{workout.Exercises.Count}-{string.Join(",", workout.Exercises.Select(e => e.Name))}";
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(content));
        return Convert.ToBase64String(hashBytes);
    }
}

// Helper classes for OpenAI API response
internal class OpenAIResponse
{
    public Choice[]? Choices { get; set; }
}

internal class Choice
{
    public Message? Message { get; set; }
}

internal class Message
{
    public string? Content { get; set; }
}

