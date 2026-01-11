// This file is for Lambda deployment with provided.al2023 runtime
// Uses Amazon.Lambda.AspNetCoreServer.Hosting for Lambda Runtime Interface Client

using Amazon.DynamoDBv2;
using AIWorkoutNow.Api.Services;
using Amazon.Lambda.AspNetCoreServer.Hosting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

// CRITICAL: Use Lambda hosting for provided.al2023 runtime
// This integrates with Lambda Runtime Interface Client
builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

// Add services
builder.Services.AddControllers();
// Swagger disabled - add Swashbuckle.AspNetCore package if needed
// builder.Services.AddEndpointsApiExplorer();
// builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()
              .WithExposedHeaders("*");
    });
});

// JWT Authentication
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "your-secret-key-change-in-production";
var key = System.Text.Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Register services
builder.Services.AddSingleton<IAmazonDynamoDB>(sp => new AmazonDynamoDBClient());
builder.Services.AddSingleton<IDynamoDBService, DynamoDBService>();
builder.Services.AddSingleton<IAIService, OpenAIService>();
builder.Services.AddSingleton<IEmailService, SESEmailService>();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddSingleton<IConfigService, ConfigService>();
builder.Services.AddSingleton<IAuthService, AuthService>();
builder.Services.AddSingleton<IAmazonAffiliateService, AmazonAffiliateService>();

var app = builder.Build();

// Configure pipeline
// Swagger disabled - uncomment if Swashbuckle.AspNetCore is added
// if (app.Environment.IsDevelopment())
// {
//     app.UseSwagger();
//     app.UseSwaggerUI();
// }

// AGGRESSIVE CORS FIX: Add CORS headers to ALL responses BEFORE any processing
// This must happen FIRST in the pipeline to ensure headers are ALWAYS set
app.Use(async (context, next) =>
{
    // CRITICAL: Set CORS headers IMMEDIATELY on response object
    // This ensures headers are set even if an error occurs
    context.Response.OnStarting(() =>
    {
        context.Response.Headers["Access-Control-Allow-Origin"] = "*";
        context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD";
        context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, *";
        context.Response.Headers["Access-Control-Expose-Headers"] = "*";
        return Task.CompletedTask;
    });
    
    // Also set headers directly (backup)
    context.Response.Headers["Access-Control-Allow-Origin"] = "*";
    context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD";
    context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, *";
    context.Response.Headers["Access-Control-Expose-Headers"] = "*";
    
    // Handle OPTIONS preflight - return early with all headers
    if (string.Equals(context.Request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.Headers["Access-Control-Max-Age"] = "3600";
        context.Response.StatusCode = 200;
        await context.Response.WriteAsync("");
        return;
    }
    
    await next();
    
    // CRITICAL: Set headers again AFTER next() to ensure they're on error responses too
    context.Response.Headers["Access-Control-Allow-Origin"] = "*";
    context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD";
    context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, *";
    context.Response.Headers["Access-Control-Expose-Headers"] = "*";
});

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// CRITICAL: For Lambda, use RunAsync() instead of Run()
// This allows Lambda Runtime Interface Client to manage the lifecycle
await app.RunAsync();
