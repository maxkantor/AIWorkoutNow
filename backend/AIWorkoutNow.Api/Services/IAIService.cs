using AIWorkoutNow.Api.Models;

namespace AIWorkoutNow.Api.Services;

public interface IAIService
{
    Task<Workout> GenerateWorkoutAsync(WorkoutPreferences preferences);
}


