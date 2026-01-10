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
        // ULTRA SIMPLE CORS FIX - Handle OPTIONS FIRST, then set headers for everything else
        app.Use(async (context, next) =>
        {
            // Handle OPTIONS immediately - return 200 with CORS headers
            if (string.Equals(context.Request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.Headers["Access-Control-Allow-Origin"] = "*";
                context.Response.Headers["Access-Control-Allow-Methods"] = "*";
                context.Response.Headers["Access-Control-Allow-Headers"] = "*";
                context.Response.Headers["Access-Control-Max-Age"] = "3600";
                context.Response.StatusCode = 200;
                await context.Response.WriteAsync("");
                return;
            }

            // For all other requests, set CORS headers and continue
            context.Response.Headers["Access-Control-Allow-Origin"] = "*";
            context.Response.Headers["Access-Control-Allow-Methods"] = "*";
            context.Response.Headers["Access-Control-Allow-Headers"] = "*";
            context.Response.Headers["Access-Control-Max-Age"] = "3600";

            await next();
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
