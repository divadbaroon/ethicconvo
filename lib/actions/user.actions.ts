"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/database/supabase/admin"
import { handleError } from "@/lib/utils"

// First, let's define our types
type CreateUserParams = {
  username: string
  clerk_id: string
  session_id?: string
}

type UpdateUserParams = {
  username?: string
  session_id?: string
  last_active?: string
  is_active?: boolean
}

type User = {
  id: string
  username: string
  clerk_id: string
  session_id: string | null
  last_active: string | null
  is_active: boolean
  created_at: string
}

// CREATE
export async function createUser(user: CreateUserParams) {
  try {
    console.log("Creating user with data:", user); 

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        username: user.username,
        clerk_id: user.clerk_id
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error); 
      throw error;
    }

    console.log("Supabase success:", data); 
    return data;
  } catch (error) {
    console.error("Error in createUser:", error); 
    throw error; 
  }
}

// READ
export async function getUserById(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    if (error) throw error
    if (!data) throw new Error("User not found")

    return data as User
  } catch (error) {
    handleError(error)
    return null
  }
}

// UPDATE
export async function updateUser(username: string, updates: UpdateUserParams) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        username: updates.username,
        session_id: updates.session_id,
        last_active: updates.last_active,
        is_active: updates.is_active
      })
      .eq('username', username)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error("User update failed")

    return data as User
  } catch (error) {
    handleError(error)
    return null
  }
}

// DELETE
export async function deleteUser(clerkId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('clerk_id', clerkId)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/")
    return data as User
  } catch (error) {
    handleError(error)
    return null
  }
}

// Get users by session ID
export async function getUsersBySessionId(sessionId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('session_id', sessionId)

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error(`No users found for sessionId: ${sessionId}`)
    }

    return data as User[]
  } catch (error) {
    handleError(error)
    return null
  }
}

// New helper functions you might find useful:

// Update user's active status
export async function updateUserActivity(clerkId: string, isActive: boolean) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        is_active: isActive,
        last_active: isActive ? new Date().toISOString() : null
      })
      .eq('clerk_id', clerkId)
      .select()
      .single()

    if (error) throw error
    return data as User
  } catch (error) {
    handleError(error)
    return null
  }
}

// Get active users
export async function getActiveUsers() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('is_active', true)

    if (error) throw error
    return data as User[]
  } catch (error) {
    handleError(error)
    return null
  }
}

