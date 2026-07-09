// Chart.js integration for call tracker — Catppuccin Mocha palette

let hourlyChartInstance = null;

const Charts = {
  initChart(canvas, data) {
    if (hourlyChartInstance) hourlyChartInstance.destroy();

    const ctx = canvas.getContext('2d');

    // Detect light mode preference
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Color values for both themes
    let chartConfig;

    if (isDarkMode) {
      // Mocha (dark) theme colors
      chartConfig = {
        backgroundColor: 'rgba(203, 166, 247, 0.7)',  // mauve
        borderColor: 'rgb(203, 166, 247)',
        hoverBackgroundColor: 'rgba(180, 190, 254, 0.85)',  // lavender
        tooltipBg: 'rgba(49, 50, 68, 0.97)',  // surface0
        textColor: '#cdd6f4',  // text
        labelColor: '#a6adc8',  // subtext0
        gridColor: 'rgba(69, 71, 90, 0.5)',
        gridColorLight: 'rgba(69, 71, 90, 0.3)',
        borderColorLine: '#45475a'  // surface1
      };
    } else {
      // Latte (light) theme colors
      chartConfig = {
        backgroundColor: 'rgba(30, 102, 245, 0.7)',  // blue
        borderColor: 'rgb(30, 102, 245)',
        hoverBackgroundColor: 'rgba(30, 102, 245, 0.85)',
        tooltipBg: 'rgba(232, 233, 237, 0.97)',  // surface0
        textColor: '#4c4f69',  // text (dark)
        labelColor: '#4c4f69',  // text (dark for WCAG AA compliance)
        gridColor: 'rgba(205, 209, 220, 0.5)',  // surface2
        gridColorLight: 'rgba(205, 209, 220, 0.3)',
        borderColorLine: '#dce1e8'  // surface1
      };
    }

    hourlyChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.getHourLabels(),
        datasets: [{
          label: 'Calls',
          data,
          backgroundColor: chartConfig.backgroundColor,
          borderColor: chartConfig.borderColor,
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: chartConfig.hoverBackgroundColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: chartConfig.tooltipBg,
            titleColor: chartConfig.textColor,
            bodyColor: chartConfig.textColor,
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
            ticks: { stepSize: 1, color: chartConfig.labelColor },
            title: { display: true, text: 'Number of Calls', color: chartConfig.labelColor },
            grid: { color: chartConfig.gridColor },
            border: { color: chartConfig.borderColorLine }
          },
          x: {
            ticks: { color: chartConfig.labelColor },
            title: { display: true, text: 'Hour of Day', color: chartConfig.labelColor },
            grid: { color: chartConfig.gridColorLight },
            border: { color: chartConfig.borderColorLine }
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
