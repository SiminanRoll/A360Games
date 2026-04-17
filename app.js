const cards = document.querySelectorAll('.card');
const resultDiv = document.getElementById('result');

let stats = {
  A: 25,
  B: 62,
  C: 13
};

cards.forEach(card => {
  card.addEventListener('click', () => {
    cards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    const choice = card.dataset.choice;

    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `
      <h2>You chose ${choice}</h2>
      <p>Most teams choose B (${stats.B}%)</p>
      <p>Gift card scams are one of the most effective real-world attacks.</p>
      <button onclick="location.reload()">Try Again</button>
    `;
  });
});
