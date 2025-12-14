import Chart from 'chart.js/auto';

import ProfilePictureHook from "./hooks/profile_picture_hook";
// import ImageCropperHook from "./hooks/image_cropper_hook";
import WalletHook from "./hooks/wallet_hook";
import UserManagementHook from "./hooks/user_management_hook";
import DynamicFormHook from "./hooks/dynamic_form_hook";
import CodeEditorHook from "./hooks/code_editor_hook";
import UserTrackingHook from "./hooks/user_tracking_hook";


const Hooks = {
  ProfilePicture: ProfilePictureHook,
  // ImageCropper: ImageCropperHook,
  WalletData: WalletHook,
  UserManagementData: UserManagementHook,
  UserTrackingHook: UserTrackingHook,
  DynamicForm: DynamicFormHook,
  CodeEditor: CodeEditorHook
};



// Debug logging for hook initialization
const addHookLogging = (hookName, hook) => {
  const originalMounted = hook.mounted || (() => {});
  hook.mounted = function() {
    // console.log(`[Hook Debug] ${hookName} mounted`);
    return originalMounted.call(this);
  };
  return hook;
};

Hooks.ComparisonChart = addHookLogging('ComparisonChart', {
  mounted() {
    this.createChart();
  },
  updated() {
    this.chart.destroy();
    this.createChart();
  },
  createChart() {
    const ctx = this.el.getContext('2d');
    const data = JSON.parse(this.el.dataset.chartData);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Wallet',
            data: data.wallet,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          },
          {
            label: 'Account',
            data: data.account,
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
});

Hooks.DistributionChart = addHookLogging('DistributionChart', {
  mounted() {
    this.createChart();
  },
  updated() {
    this.chart.destroy();
    this.createChart();
  },
  createChart() {
    const ctx = this.el.getContext('2d');
    const data = JSON.parse(this.el.dataset.chartData);

    this.chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Wallet Transactions', 'Account Transactions'],
        datasets: [{
          data: [data.wallet[0], data.account[0]],
          backgroundColor: ['rgb(75, 192, 192)', 'rgb(255, 99, 132)'],
          borderColor: ['rgb(75, 192, 192)', 'rgb(255, 99, 132)'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
});

Hooks.TransactionsChart = addHookLogging('TransactionsChart', {
    mounted() {
      this.createChart();
    },
    updated() {
      this.chart.destroy();
      this.createChart();
    },
    createChart() {
      const ctx = this.el.getContext('2d');
      const data = JSON.parse(this.el.dataset.chartData);

      this.chart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: false,
              grid: {
                display: false
              }
            },
            y: {
              stacked: false,
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 20
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        }
      });
    }
});


Hooks.Download = addHookLogging('Download', {
    mounted() {
      this.handleEvent("download-file", ({content, filename, content_type}) => {
        // Convert base64 to blob
        const byteCharacters = atob(content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: content_type});

        // Create download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      })
    }
});

Hooks.SystemMetrics = addHookLogging('SystemMetrics', {
  mounted() {
    this.handleEvent("update_metrics", ({ uptime, memory }) => {
      const uptimeEl = document.getElementById("metrics-uptime");
      const memoryEl = document.getElementById("metrics-memory");
      if (uptimeEl) uptimeEl.textContent = uptime;
      if (memoryEl) memoryEl.textContent = memory;
    });
  }
});

Hooks.Charts = addHookLogging('Charts', {
  mounted() {
    this.initializeCharts();
  },
  updated() {
    // Destroy existing charts
    if (this.charts) {
      Object.values(this.charts).forEach(chart => chart.destroy());
    }
    this.initializeCharts();
  },
  initializeCharts() {
    const chartData = JSON.parse(this.el.dataset.chartData);
    this.charts = {};

    // Volume Chart
    this.charts.volume = new ApexCharts(document.querySelector("#volumeChart"), {
      chart: {
        type: 'line',
        height: 300,
        toolbar: { show: false }
      },
      series: [{
        name: 'Transactions',
        data: chartData.volume_data.map(d => d.count)
      }],
      xaxis: {
        categories: chartData.volume_data.map(d => d.date)
      },
      stroke: { curve: 'smooth' },
      colors: ['#4F46E5']
    });
    this.charts.volume.render();

    // Status Chart
    this.charts.status = new ApexCharts(document.querySelector("#statusChart"), {
      chart: {
        type: 'pie',
        height: 300
      },
      series: chartData.status_data.map(d => d.count),
      labels: chartData.status_data.map(d => d.status),
      colors: ['#10B981', '#F59E0B', '#EF4444']
    });
    this.charts.status.render();

    // Amount Chart
    this.charts.amount = new ApexCharts(document.querySelector("#amountChart"), {
      chart: {
        type: 'bar',
        height: 300,
        toolbar: { show: false }
      },
      series: [{
        name: 'Transactions',
        data: chartData.amount_data.map(d => d.count)
      }],
      xaxis: {
        categories: chartData.amount_data.map(d => d.range)
      },
      colors: ['#6366F1']
    });
    this.charts.amount.render();

    // Type Chart
    this.charts.type = new ApexCharts(document.querySelector("#typeChart"), {
      chart: {
        type: 'donut',
        height: 300
      },
      series: chartData.type_data.map(d => d.count),
      labels: chartData.type_data.map(d => d.type),
      colors: ['#8B5CF6', '#EC4899', '#F97316', '#14B8A6']
    });
    this.charts.type.render();
  }
});

Hooks.LogCharts = addHookLogging('LogCharts', {
  mounted() {
    this.initializeCharts();
  },
  updated() {
    // Destroy existing charts
    if (this.charts) {
      Object.values(this.charts).forEach(chart => chart.destroy());
    }
    this.initializeCharts();
  },
  initializeCharts() {
    const chartData = JSON.parse(this.el.dataset.chartData);
    this.charts = {};

    // Volume Chart
    this.charts.volume = new ApexCharts(document.querySelector("#volumeChart"), {
      chart: {
        type: 'line',
        height: 300,
        toolbar: { show: false }
      },
      series: [{
        name: 'Logs',
        data: chartData.volume_data.map(d => d.count)
      }],
      xaxis: {
        categories: chartData.volume_data.map(d => d.date)
      },
      stroke: { curve: 'smooth' },
      colors: ['#4F46E5']
    });
    this.charts.volume.render();

    // Function Distribution Chart
    this.charts.function = new ApexCharts(document.querySelector("#functionChart"), {
      chart: {
        type: 'bar',
        height: 300,
        toolbar: { show: false }
      },
      series: [{
        name: 'Function Calls',
        data: chartData.function_data.map(d => d.count)
      }],
      xaxis: {
        categories: chartData.function_data.map(d => d.function),
        labels: {
          rotate: -45,
          trim: true,
          maxHeight: 100
        }
      },
      colors: ['#6366F1']
    });
    this.charts.function.render();

    // Module Distribution Chart
    this.charts.module = new ApexCharts(document.querySelector("#moduleChart"), {
      chart: {
        type: 'pie',
        height: 300
      },
      series: chartData.module_data.map(d => d.count),
      labels: chartData.module_data.map(d => d.module),
      colors: ['#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#10B981', '#F59E0B', '#EF4444']
    });
    this.charts.module.render();
  }
});

// console.log('[Hook Debug] Available hooks:', Object.keys(Hooks));

// Initialize hooks object
if (!window.Hooks) {
  window.Hooks = Hooks;
  // console.log('[Hook Debug] Hooks initialized globally');
}

export default Hooks;
