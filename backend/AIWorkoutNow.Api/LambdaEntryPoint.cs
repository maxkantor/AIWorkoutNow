using Amazon.Lambda.AspNetCoreServer;
using Microsoft.AspNetCore.Hosting;

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
        // All services are configured in Program.cs
        // This method can be left empty or used for Lambda-specific configuration
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        // Pipeline is configured in Program.cs
        // This method can be left empty or used for Lambda-specific configuration
    }
}
