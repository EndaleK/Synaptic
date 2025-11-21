/**
 * Check login tracking and streak data
 * Run with: npx tsx scripts/check-login-tracking.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔍 Checking login tracking for all users...\n')

  // Get all user profiles with login data
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, email, clerk_user_id, last_login_date, current_streak, longest_streak, created_at')
    .order('last_login_date', { ascending: false })

  if (error) {
    console.error('❌ Error fetching profiles:', error)
    return
  }

  if (!profiles || profiles.length === 0) {
    console.log('⚠️  No user profiles found!')
    return
  }

  console.log(`👥 Total users: ${profiles.length}\n`)

  // Get today's date
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  console.log(`📅 Today: ${today}`)
  console.log(`📅 Yesterday: ${yesterday}\n`)

  // Analyze each user
  profiles.forEach((profile, idx) => {
    const lastLogin = profile.last_login_date
    const daysSinceLogin = lastLogin
      ? Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
      : null

    let status = '❌ Never logged in'
    if (lastLogin === today) {
      status = '✅ Logged in today'
    } else if (lastLogin === yesterday) {
      status = '⚠️  Logged in yesterday (streak at risk!)'
    } else if (daysSinceLogin !== null && daysSinceLogin <= 7) {
      status = `⏰ Last login ${daysSinceLogin} days ago`
    } else if (daysSinceLogin !== null) {
      status = `💤 Inactive (${daysSinceLogin} days ago)`
    }

    console.log(`${idx + 1}. ${profile.email || profile.clerk_user_id}`)
    console.log(`   Status: ${status}`)
    console.log(`   Last Login: ${lastLogin || 'Never'}`)
    console.log(`   Current Streak: 🔥 ${profile.current_streak || 0} days`)
    console.log(`   Longest Streak: 🏆 ${profile.longest_streak || 0} days`)
    console.log(`   Account Created: ${new Date(profile.created_at).toLocaleDateString()}`)
    console.log('')
  })

  // Summary statistics
  const loggedInToday = profiles.filter(p => p.last_login_date === today).length
  const loggedInYesterday = profiles.filter(p => p.last_login_date === yesterday).length
  const activeStreaks = profiles.filter(p => (p.current_streak || 0) > 0).length
  const neverLoggedIn = profiles.filter(p => !p.last_login_date).length

  console.log('📊 Summary:')
  console.log(`   Logged in today: ${loggedInToday}`)
  console.log(`   Logged in yesterday: ${loggedInYesterday}`)
  console.log(`   Active streaks: ${activeStreaks}`)
  console.log(`   Never logged in: ${neverLoggedIn}`)
  console.log(`   Total users: ${profiles.length}`)

  // Find users with issues
  console.log('\n🔍 Potential Issues:')

  const issueUsers = profiles.filter(p => {
    const lastLogin = p.last_login_date
    if (!lastLogin) return false

    const daysSince = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
    return daysSince >= 2 && (p.current_streak || 0) > 0
  })

  if (issueUsers.length > 0) {
    console.log(`   ⚠️  ${issueUsers.length} users have streaks but haven't logged in recently:`)
    issueUsers.forEach(user => {
      const daysSince = Math.floor((Date.now() - new Date(user.last_login_date!).getTime()) / (1000 * 60 * 60 * 24))
      console.log(`      - ${user.email || user.clerk_user_id}: ${daysSince} days since login, streak: ${user.current_streak}`)
    })
  } else {
    console.log('   ✅ No users with stale streaks')
  }
}

main().catch(console.error)
