// ABOUT: Admin login component for Cloudflare Access + Google OAuth
// ABOUT: Replaced magic-link flow with a single Google sign-in redirect

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface LoginFormProps {
  onBack?: () => void;
}

export const LoginForm = ({ onBack }: LoginFormProps) => {
  const { signIn } = useAuth();

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
          Sign in with your Google account to access the admin panel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={signIn}
            className="flex-1 gap-2"
            variant="brutalist"
          >
            Sign in with Google
          </Button>
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
            >
              Back
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Access is restricted to authorised users only.
        </p>
      </CardContent>
    </Card>
  );
};
