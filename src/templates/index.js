window.addEventListener('load', () => {
  const inputs = document.body.querySelectorAll(".answer input");

  [].forEach.call(inputs, (input) => {
    input.onclick = (e) => {
      e.preventDefault();
    };
  });
});
