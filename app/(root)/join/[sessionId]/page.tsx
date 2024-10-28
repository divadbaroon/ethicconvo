"use client"

import { useEffect, useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { createTemporaryUser, getUserBySessionId, deleteUser } from '@/lib/actions/user.actions';
import { getSessionById } from '@/lib/actions/session.actions';

export default function JoinSession({ params }: { params: { sessionId: string }}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const signInHelper = useSignIn();
  const router = useRouter();

  useEffect(() => {
    const initializeUser = async () => {
      try {
        console.log('Starting user initialization...');
        
        if (!signInHelper?.signIn || !signInHelper?.setActive) {
          console.error('SignIn helper not available:', signInHelper);
          setError("Authentication service not available");
          setLoading(false);
          return;
        }

        const { signIn, setActive } = signInHelper;

        // Check session
        console.log('Checking session:', params.sessionId);
        const session = await getSessionById(params.sessionId);
        if (!session) {
          console.error('Session not found');
          setError("Session not found or has expired");
          setLoading(false);
          return;
        }

        if (session.status === 'completed') {
          console.error('Session completed');
          setError("This session has ended");
          setLoading(false);
          return;
        }

        // Try to get existing user
        console.log('Checking for existing user...');
        let existingUser = await getUserBySessionId(params.sessionId);
        console.log('Existing user check result:', existingUser);

        let signInAttempt;
        let userData;

        // Try to handle existing user first
        if (existingUser) {
          try {
            console.log('Found existing user, attempting sign in...');
            signInAttempt = await signIn.create({
              identifier: `${existingUser.username}@temporary.edu`,
              password: existingUser.temp_password,
            });
            userData = existingUser;
          } catch (signInError) {
            console.log('Sign in failed with existing user, creating new one...');
            // If sign in fails, delete the old user and create a new one
            if (existingUser.clerk_id) {
              await deleteUser(existingUser.clerk_id);
            }
            const { username, password, userData: newUserData } = await createTemporaryUser(params.sessionId);
            signInAttempt = await signIn.create({
              identifier: `${username}@temporary.edu`,
              password: password,
            });
            userData = newUserData;
          }
        } else {
          // Create new user if none exists
          console.log('No existing user found, creating new user...');
          const { username, password, userData: newUserData } = await createTemporaryUser(params.sessionId);
          signInAttempt = await signIn.create({
            identifier: `${username}@temporary.edu`,
            password: password,
          });
          userData = newUserData;
        }

        if (signInAttempt?.status === "complete" && signInAttempt.createdSessionId) {
          console.log('Sign in completed successfully');
          await setActive({ session: signInAttempt.createdSessionId });
          
          // Store user data
          localStorage.setItem('tempUserId', userData.id);
          
          // Redirect with multiple fallbacks
          const redirectUrl = `/join/${params.sessionId}/group`;
          console.log('Redirecting to:', redirectUrl);
          
          // Try immediate redirect
          window.location.href = redirectUrl;

        } else {
          throw new Error("Failed to complete sign in process");
        }
      } catch (error) {
        console.error("Error initializing user:", error);
        setError(error instanceof Error ? error.message : "Failed to join session");
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, [params.sessionId, signInHelper, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Preparing your session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}