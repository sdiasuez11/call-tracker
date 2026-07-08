// Chart.js integration for call tracker — Catppuccin Mocha palette

let hourlyChartInstance = null;

const Charts = {
  initChart(canvas, data) {
    if (hourlyChartInstance) hourlyChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    hourlyChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.getHourLabels(),
        datasets: [{
          label: 'Calls',
          data,
          backgroundColor:     'rgba(203, 166, 247, 0.7)',  // mauve
          borderColor:         'rgb(203, 166, 247)',
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: 'rgba(180, 190, 254, 0.85)' // lavender on hover
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(49, 50, 68, 0.97)',  // surface0
            titleColor: '#cdd6f4',
            bodyColor:  '#cdd6f4',
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (ctx) => ctx.parsed.y + ' call' + (ctx.parsed.y !== 1 ? 's' : '')
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks:  { stepSize: 1, color: '#a6adc8' },
            title:  { display: true, text: 'Number of Calls', color: '#a6adc8' },
            grid:   { color: 'rgba(69, 71, 90, 0.5)' },
            border: { color: '#45475a' }
          },
          x: {
            ticks:  { color: '#a6adc8' },
            title:  { display: true, text: 'Hour of Day', color: '#a6adc8' },
            grid:   { color: 'rgba(69, 71, 90, 0.3)' },
            border: { color: '#45475a' }
          }
        }
      }
    });

    return hourlyChartInstance;
  },

  getHourLabels() {
    const labels = [];
    for (let i = 0; i < 24; i++) labels.push(i.toString().padStart(2, '0') + ':00');
    return labels;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Charts;
}
