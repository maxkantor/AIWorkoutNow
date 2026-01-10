using Amazon.Lambda.AspNetCoreServer;
using Amazon.DynamoDBv2;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Net;
using Microsoft.AspNetCore.Http;
using System;
using System.Threading.Tasks;
using System.Text.Json;
using AIWorkoutNow.Api.Services;

namespace AIWorkoutNow.Api;

public class LambdaEntryPoint : APIGatewayHttpApiV2ProxyFunction
{
    protected override void Init(IWebHostBuilder builder)
    {
        builder
            .UseStartup<Startup>();
    }
}

public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        // Add services
        services.AddControllers();
        // Swagger disabled for Lambda
        // services.AddEndpointsApiExplorer();
        // services.AddSwaggerGen();

        // CORS
        services.AddCors(options =>
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
        var key = Encoding.UTF8.GetBytes(jwtSecret);

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
        });

        services.AddAuthorization();

        // Register services
        services.AddSingleton<IAmazonDynamoDB>(sp => new AmazonDynamoDBClient());
        services.AddSingleton<IDynamoDBService, DynamoDBService>();
        services.AddSingleton<IAIService, OpenAIService>();
        services.AddSingleton<IEmailService, SESEmailService>();
        services.AddSingleton<ITokenService, TokenService>();
        services.AddSingleton<IConfigService, ConfigService>();
        services.AddSingleton<IAuthService, AuthService>();
        services.AddSingleton<IAmazonAffiliateService, AmazonAffiliateService>();
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        // AGGRESSIVE CORS FIX - Handle OPTIONS at the VERY FIRST middleware
        // This must run before ANY other middleware
        app.Use(async (context, next) =>
        {
            // AGGRESSIVE: Set CORS headers on EVERY response, no matter what
            context.Response.OnStarting(() =>
            {
                // Ensure headers are set even if they were removed
                context.Response.Headers["Access-Control-Allow-Origin"] = "*";
                context.Response.Headers["Access-Control-Allow-Methods"] = "*";
                context.Response.Headers["Access-Control-Allow-Headers"] = "*";
                context.Response.Headers["Access-Control-Allow-Credentials"] = "false";
                context.Response.Headers["Access-Control-Max-Age"] = "3600";
                context.Response.Headers["Access-Control-Expose-Headers"] = "*";
                return Task.CompletedTask;
            });

            // Set CORS headers immediately
            context.Response.Headers["Access-Control-Allow-Origin"] = "*";
            context.Response.Headers["Access-Control-Allow-Methods"] = "*";
            context.Response.Headers["Access-Control-Allow-Headers"] = "*";
            context.Response.Headers["Access-Control-Allow-Credentials"] = "false";
            context.Response.Headers["Access-Control-Max-Age"] = "3600";
            context.Response.Headers["Access-Control-Expose-Headers"] = "*";

            // AGGRESSIVE: Handle OPTIONS immediately - don't let it go to controllers
            if (context.Request.Method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = 200;
                context.Response.ContentType = "text/plain";
                // Lambda needs a response body for OPTIONS in some cases
                await context.Response.WriteAsync("OK");
                return;
            }

            try
            {
                await next();
                
                // AGGRESSIVE: Re-apply CORS headers after next() in case they were removed
                if (!context.Response.HasStarted)
                {
                    context.Response.Headers["Access-Control-Allow-Origin"] = "*";
                    context.Response.Headers["Access-Control-Allow-Methods"] = "*";
                    context.Response.Headers["Access-Control-Allow-Headers"] = "*";
                    context.Response.Headers["Access-Control-Expose-Headers"] = "*";
                }
            }
            catch (Exception ex)
            {
                // AGGRESSIVE: Ensure CORS headers are ALWAYS set, even on errors
                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = 500;
                    context.Response.Headers["Access-Control-Allow-Origin"] = "*";
                    context.Response.Headers["Access-Control-Allow-Methods"] = "*";
                    context.Response.Headers["Access-Control-Allow-Headers"] = "*";
                    context.Response.Headers["Access-Control-Expose-Headers"] = "*";
                    context.Response.ContentType = "application/json";
                    var errorResponse = System.Text.Json.JsonSerializer.Serialize(new { 
                        error = "Internal server error",
                        message = ex.Message
                    });
                    await context.Response.WriteAsync(errorResponse);
                }
                // Don't rethrow - we've already handled the error response with CORS headers
            }
        });

        // CORS must be before UseRouting for OPTIONS preflight requests
        // Enable CORS for all origins (required for API Gateway HTTP API)
        app.UseCors("AllowAll");
        app.UseRouting();
        app.UseAuthentication();
        app.UseAuthorization();
        
        
        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
        });
    }
}
