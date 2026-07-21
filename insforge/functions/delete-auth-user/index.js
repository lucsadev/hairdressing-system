// Edge Function: delete-auth-user
// Deletes a user from Authentication Users
// Called from the frontend when an admin deletes a user

const OSS_HOST = 'https://ym5zuqiu.us-east.insforge.app'
const ADMIN_API_KEY = 'ik_b7ed08ab7cae90a8fc22fbbbc3c5b873'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}

module.exports = async function(request) {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      })
    }

    const { userId } = await request.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: CORS_HEADERS
      })
    }

    // Delete the user from Authentication Users via admin API
    const authResponse = await fetch(`${OSS_HOST}/api/auth/users`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_API_KEY}`
      },
      body: JSON.stringify({ userIds: [userId] })
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error('[delete-auth-user] Auth API error:', authResponse.status, errorText)
      return new Response(JSON.stringify({ 
        error: `Failed to delete auth user: ${authResponse.status}`,
        details: errorText
      }), {
        status: 500,
        headers: CORS_HEADERS
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: CORS_HEADERS
    })
  } catch (err) {
    console.error('[delete-auth-user] Unexpected error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: CORS_HEADERS
    })
  }
}
