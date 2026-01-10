using System;
using BCrypt.Net;

class Program {
    static void Main(string[] args) {
        if (args.Length < 1) {
            Console.Error.WriteLine("Usage: hash-password <password>");
            Environment.Exit(1);
        }
        string password = args[0];
        string hash = BCrypt.Net.BCrypt.HashPassword(password, BCrypt.Net.BCrypt.GenerateSalt());
        Console.WriteLine(hash);
    }
}
