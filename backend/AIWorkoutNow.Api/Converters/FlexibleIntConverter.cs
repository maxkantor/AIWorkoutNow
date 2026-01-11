using System.Text.Json;
using System.Text.Json.Serialization;

namespace AIWorkoutNow.Api.Converters;

/// <summary>
/// Custom JSON converter that handles both string and int values for nullable int properties.
/// This is needed because AI sometimes returns numbers as strings (e.g., "12" or "12-15").
/// </summary>
public class FlexibleIntConverter : JsonConverter<int?>
{
    public override int? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        if (reader.TokenType == JsonTokenType.Number)
        {
            return reader.GetInt32();
        }

        if (reader.TokenType == JsonTokenType.String)
        {
            var stringValue = reader.GetString();
            if (string.IsNullOrWhiteSpace(stringValue))
            {
                return null;
            }

            // Handle ranges like "12-15" by taking the first number
            if (stringValue.Contains('-'))
            {
                var parts = stringValue.Split('-');
                if (parts.Length > 0 && int.TryParse(parts[0].Trim(), out var firstValue))
                {
                    return firstValue;
                }
            }

            // Try to parse as int
            if (int.TryParse(stringValue, out var intValue))
            {
                return intValue;
            }

            // If parsing fails, return null instead of throwing
            return null;
        }

        // For any other token type, return null
        return null;
    }

    public override void Write(Utf8JsonWriter writer, int? value, JsonSerializerOptions options)
    {
        if (value.HasValue)
        {
            writer.WriteNumberValue(value.Value);
        }
        else
        {
            writer.WriteNullValue();
        }
    }
}
