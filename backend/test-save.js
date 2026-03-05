import fetch from 'node-fetch'; // Requires node-fetch or native fetch in node 18+

async function test() {
    try {
        // Need to login first to get a token!
        const loginRes = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'saadisherewhy21@gmail.com', password: 'password123' }) // Using known default seeded admin
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        if (!token) {
            console.error('Login failed:', loginData);
            return;
        }

        const res = await fetch('http://localhost:3001/api/samples/7/results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                results: [{ sample_test_id: 1, component_id: 1, value: "123" }],
                notes: "test",
                remarks: "test"
            })
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (e) {
        console.error(e);
    }
}

test();
