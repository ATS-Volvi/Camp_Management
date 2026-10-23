async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/ai/ai-dish-ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dishName: 'Chicken Kabsa',
        headcount: 50,
        availableIngredients: [
          { id: '1', name: 'Basmati Rice', unit: 'kg' },
          { id: '2', name: 'Fresh Chicken', unit: 'kg' }
        ]
      })
    });
    console.log('status:', res.status);
    const data = await res.json();
    console.log('response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
  process.exit(0);
}
test();
