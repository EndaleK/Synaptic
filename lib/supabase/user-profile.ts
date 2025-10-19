// User Profile and Learning Profile Database Operations
import { createClient } from './server'
import type { UserProfile, LearningProfile, LearningStyle } from './types'

/**
 * Get user profile by Clerk user ID
 */
export async function getUserProfile(clerkUserId: string): Promise<{
  profile: UserProfile | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (error) {
      // User not found is not an error - just return null
      if (error.code === 'PGRST116') {
        return { profile: null, error: null }
      }
      console.error('Error fetching user profile:', error)
      return { profile: null, error: error.message }
    }

    return { profile: data as UserProfile, error: null }
  } catch (error) {
    console.error('getUserProfile exception:', error)
    return {
      profile: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Create a new user profile
 */
export async function createUserProfile(data: {
  clerk_user_id: string
  email: string
  full_name?: string
  learning_style?: LearningStyle
  preferred_mode?: string
}): Promise<{
  profile: UserProfile | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .insert([{
        clerk_user_id: data.clerk_user_id,
        email: data.email,
        full_name: data.full_name,
        learning_style: data.learning_style,
        preferred_mode: data.preferred_mode,
        subscription_tier: 'free',
        subscription_status: 'inactive',
        documents_used_this_month: 0
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      return { profile: null, error: error.message }
    }

    return { profile: profile as UserProfile, error: null }
  } catch (error) {
    console.error('createUserProfile exception:', error)
    return {
      profile: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  clerkUserId: string,
  updates: Partial<UserProfile>
): Promise<{
  profile: UserProfile | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('clerk_user_id', clerkUserId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return { profile: null, error: error.message }
    }

    return { profile: profile as UserProfile, error: null }
  } catch (error) {
    console.error('updateUserProfile exception:', error)
    return {
      profile: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Save learning profile assessment results
 */
export async function saveLearningProfile(data: {
  user_id: string
  quiz_responses: Record<string, any>
  visual_score: number
  auditory_score: number
  kinesthetic_score: number
  reading_writing_score: number
  dominant_style: LearningStyle
  teaching_style_preference?: string
  socratic_percentage?: number
  teaching_style_scores?: {
    socratic: number
    direct: number
  }
  learning_preferences?: Record<string, any>
}): Promise<{
  learningProfile: LearningProfile | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: learningProfile, error } = await supabase
      .from('learning_profiles')
      .insert([{
        user_id: data.user_id,
        quiz_responses: data.quiz_responses,
        visual_score: data.visual_score,
        auditory_score: data.auditory_score,
        kinesthetic_score: data.kinesthetic_score,
        reading_writing_score: data.reading_writing_score,
        dominant_style: data.dominant_style,
        teaching_style_preference: data.teaching_style_preference,
        socratic_percentage: data.socratic_percentage,
        teaching_style_scores: data.teaching_style_scores,
        learning_preferences: data.learning_preferences
      }])
      .select()
      .single()

    if (error) {
      console.error('Error saving learning profile:', error)
      return { learningProfile: null, error: error.message }
    }

    return { learningProfile: learningProfile as LearningProfile, error: null }
  } catch (error) {
    console.error('saveLearningProfile exception:', error)
    return {
      learningProfile: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get user's learning profile
 */
export async function getUserLearningProfile(userId: string): Promise<{
  learningProfile: LearningProfile | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('learning_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('assessment_date', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // Not found is not an error
      if (error.code === 'PGRST116') {
        return { learningProfile: null, error: null }
      }
      console.error('Error fetching learning profile:', error)
      return { learningProfile: null, error: error.message }
    }

    return { learningProfile: data as LearningProfile, error: null }
  } catch (error) {
    console.error('getUserLearningProfile exception:', error)
    return {
      learningProfile: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
