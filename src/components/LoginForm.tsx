import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface LoginFormProps {
  onBack?: () => void;
}

export const LoginForm = ({ onBack }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState("");
  
  const { signInWithEmail } = useAuth();

  const AUTHORIZED_EMAIL = import.meta.env.VITE_AUTHORIZED_ADMIN_EMAIL;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    // Check if email is authorized
    if (email.toLowerCase() !== AUTHORIZED_EMAIL.toLowerCase()) {
      setError("Access denied. Only authorized users can access the admin panel.");
      setIsLoading(false);
      return;
    }
    
    try {
      await signInWithEmail(email);
      setIsEmailSent(true);
    } catch (error: any) {
      setError(error.message || "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <Card className="border-2 border-olive-green max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-olive-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-olive-green" />
          </div>
          <CardTitle className="text-xl font-geo text-foreground">
            Check Your Email
          </CardTitle>
          <CardDescription>
            We've sent a magic link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Click the link in your email to sign in to the admin panel.</p>
            <p>The email should arrive within a few seconds.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEmailSent(false)}
              className="flex-1"
            >
              Try Different Email
            </Button>
            {onBack && (
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="flex-1"
              >
                Back to Public View
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-charcoal max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-charcoal/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-charcoal" />
        </div>
        <CardTitle className="text-xl font-geo text-foreground">
          Admin Access
        </CardTitle>
        <CardDescription>
          Enter your email to receive a magic link for secure access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="pl-10 border-charcoal"
              />
            </div>
          </div>
          
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={isLoading || !email}
              className="flex-1 gap-2"
              variant="brutalist"
            >
              <Mail className="w-4 h-4" />
              {isLoading ? "Sending..." : "Send Magic Link"}
            </Button>
            {onBack && (
              <Button 
                type="button"
                variant="ghost" 
                onClick={onBack}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
          </div>
        </form>
        
        <div className="mt-4 text-xs text-muted-foreground text-center">
          <p>No password required. Check your email for the secure login link.</p>
        </div>
      </CardContent>
    </Card>
  );
};