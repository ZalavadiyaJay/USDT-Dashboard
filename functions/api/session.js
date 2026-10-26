export async function onRequestGet(context) {
  const cookieHeader = context.request.headers.get('Cookie') || '';
  const cookies = {};
  cookieHeader.split(';').forEach(c => {
    const parts = c.trim().split('=');
    if (parts.length >= 2) {
      cookies[parts[0]] = parts.slice(1).join('=');
    }
  });

  if (cookies.admin_session && cookies.admin_session.length > 5) {
    return new Response(JSON.stringify({
      authenticated: true,
      email: 'zalavadiyajay3814@gmail.com',
      name: 'Jay Zalavadiya'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  return new Response(JSON.stringify({ authenticated: false }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
