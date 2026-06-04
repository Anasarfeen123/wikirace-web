(function() {
  const plotArea = document.getElementById('plot-area');
  const loader = document.getElementById('plot-loader');
  const btn2d = document.getElementById('btn-2d');
  const btn3d = document.getElementById('btn-3d');
  
  let currentData = null;
  let currentMode = '2d';

  // Sketchy colors (Pen/Marker palette)
  const CATEGORY_COLORS = {
    'Science': '#2980b9',   // Blue pen
    'History': '#8e44ad',   // Purple pen
    'Pop Culture': '#e67e22', // Orange marker
    'Geography': '#27ae60', // Green pen
    'Technology': '#2c3e50'  // Graphite
  };

  async function init() {
    try {
      console.log('Initializing visualizer...');
      await new Promise(resolve => setTimeout(resolve, 500));

      if (typeof Plotly === 'undefined') {
        throw new Error('Plotly library not loaded.');
      }
      
      const endpoint = (window.WIKIRACE_API && window.WIKIRACE_API.embeddings) || '/api/embeddings';
      const response = await fetch(endpoint);
      currentData = await response.json();
      
      renderPlot();
      loader.classList.add('hidden');
    } catch (error) {
      console.error('Visualization error:', error);
      loader.innerHTML = `<span style="color: var(--ink-red)">Error: ${error.message}</span>`;
    }
  }

  async function renderPlot() {
    if (!currentData) return;
    
    loader.classList.remove('hidden');
    loader.querySelector('div').textContent = `SKETCHING ${currentMode.toUpperCase()}...`;

    requestAnimationFrame(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      try {
        const traces = {};
        
        currentData.forEach(item => {
          if (!traces[item.category]) {
            traces[item.category] = {
              name: item.category,
              mode: 'markers',
              type: currentMode === '2d' ? 'scatter' : 'scatter3d',
              x: [],
              y: [],
              text: [],
              marker: {
                size: currentMode === '2d' ? 10 : 6,
                color: CATEGORY_COLORS[item.category] || '#2c3e50',
                opacity: 0.7,
                symbol: 'circle'
              },
              hoverinfo: 'text'
            };
            if (currentMode === '3d') {
              traces[item.category].z = [];
            }
          }
          
          const trace = traces[item.category];
          if (currentMode === '2d') {
            trace.x.push(item.x2d);
            trace.y.push(item.y2d);
          } else {
            trace.x.push(item.x3d);
            trace.y.push(item.y3d);
            trace.z.push(item.z3d);
          }
          trace.text.push(item.word);
        });

        const plotData = Object.values(traces);

        const commonLayout = {
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 0, r: 0, t: 0, b: 0 },
          showlegend: true,
          legend: {
            font: { color: '#2c3e50', family: 'Patrick Hand, cursive', size: 14 },
            bgcolor: 'rgba(255,255,255,0.7)',
            bordercolor: '#2c3e50',
            borderwidth: 1
          },
          font: { color: '#2c3e50', family: 'Patrick Hand, cursive' }
        };

        let layout;
        if (currentMode === '2d') {
          layout = {
            ...commonLayout,
            xaxis: { showgrid: true, gridcolor: '#eee', zeroline: false, showticklabels: false },
            yaxis: { showgrid: true, gridcolor: '#eee', zeroline: false, showticklabels: false },
            hovermode: 'closest'
          };
        } else {
          layout = {
            ...commonLayout,
            scene: {
              xaxis: { showgrid: false, zeroline: false, showticklabels: false, title: '' },
              yaxis: { showgrid: false, zeroline: false, showticklabels: false, title: '' },
              zaxis: { showgrid: false, zeroline: false, showticklabels: false, title: '' },
              bgcolor: 'rgba(0,0,0,0)',
              camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
            }
          };
        }

        const config = {
          responsive: true,
          displayModeBar: false
        };

        await Plotly.newPlot(plotArea, plotData, layout, config);
        loader.classList.add('hidden');
      } catch (err) {
        console.error('Render error:', err);
        loader.innerHTML = `<span style="color: var(--ink-red)">Sketching Failed: ${err.message}</span>`;
      }
    });
  }

  btn2d.addEventListener('click', () => {
    if (currentMode === '2d') return;
    currentMode = '2d';
    btn2d.classList.add('active');
    btn3d.classList.remove('active');
    renderPlot();
  });

  btn3d.addEventListener('click', () => {
    if (currentMode === '3d') return;
    currentMode = '3d';
    btn3d.classList.add('active');
    btn2d.classList.remove('active');
    renderPlot();
  });

  window.addEventListener('resize', () => Plotly.Plots.resize(plotArea));
  init();
})();
