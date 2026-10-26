export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    const ADMIN_EMAIL = 'zalavadiyajay3814@gmail.com';
    const ADMIN_PASSWORD = 'Jay@12345';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = 'cf_adm_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const cookieHeader = `admin_session=${token}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax; Secure`;

      return new Response(JSON.stringify({
        success: true,
        user: {
          email: ADMIN_EMAIL,
          name: 'Jay Zalavadiya'
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader
        }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid email or password'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: 'Malformed request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
