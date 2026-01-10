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

var app = builder.Build();

// Configure pipeline
// Swagger disabled - uncomment if Swashbuckle.AspNetCore is added
// if (app.Environment.IsDevelopment())
// {
//     app.UseSwagger();
//     app.UseSwaggerUI();
// }

// CRITICAL: Add CORS headers to ALL responses BEFORE any processing
// This must happen first in the pipeline to ensure headers are always set
app.Use(async (context, next) =>
{
    // CRITICAL: Set CORS headers BEFORE calling next() to ensure they're on all responses
    context.Response.Headers["Access-Control-Allow-Origin"] = "*";
    context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD";
    context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, *";
    context.Response.Headers["Access-Control-Expose-Headers"] = "*";
    
    // Handle OPTIONS preflight - return early
    if (string.Equals(context.Request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.Headers["Access-Control-Max-Age"] = "3600";
        context.Response.StatusCode = 200;
        await context.Response.WriteAsync("");
        return;
    }
    
    await next();
});

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// CRITICAL: For Lambda, use RunAsync() instead of Run()
// This allows Lambda Runtime Interface Client to manage the lifecycle
await app.RunAsync();
