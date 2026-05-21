(function() {
  const plotArea = document.getElementById('plot-area');
  const loader = document.getElementById('plot-loader');
  const btn2d = document.getElementById('btn-2d');
  const btn3d = document.getElementById('btn-3d');
  
  let currentData = null;
  let currentMode = '2d';

  const CATEGORY_COLORS = {
    'Science': '#00f2ff',
    'History': '#ffcc00',
    'Pop Culture': '#ff00ff',
    'Geography': '#00ff66',
    'Technology': '#ffffff'
  };

  async function init() {
    try {
      console.log('Initializing visualizer...');
      
      // Small delay to ensure CDN scripts have finished execution
      await new Promise(resolve => setTimeout(resolve, 500));

      if (typeof Plotly === 'undefined') {
        throw new Error('Plotly library not loaded. Please check your internet connection or try refreshing.');
      }
      
      const endpoint = (window.WIKIRACE_API && window.WIKIRACE_API.embeddings) || '/api/embeddings';
      console.log('Fetching from:', endpoint);
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      currentData = await response.json();
      if (!Array.isArray(currentData)) {
        throw new Error('Invalid data format received from API');
      }
      
      console.log(`Loaded ${currentData.length} data points`);
      renderPlot();
      loader.classList.add('hidden');
    } catch (error) {
      console.error('Visualization error:', error);
      loader.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <span style="color: var(--danger); font-weight: bold; display: block; margin-bottom: 0.5rem;">Visualization Error</span>
          <span style="color: var(--text-muted); font-size: 0.9rem;">${error.message}</span>
          <button onclick="location.reload()" style="margin-top: 1rem; background: var(--surface2); color: var(--text); border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Retry</button>
        </div>
      `;
    }
  }

  async function renderPlot() {
    if (!currentData) return;
    
    // Show loader during rendering if it's already hidden
    loader.classList.remove('hidden');
    loader.querySelector('span').textContent = `Rendering ${currentMode.toUpperCase()}...`;

    // Use requestAnimationFrame to let the UI update (show loader) before heavy computation
    requestAnimationFrame(async () => {
      // Small delay to ensure loader is visible
      await new Promise(resolve => setTimeout(resolve, 50));
      
      try {
        const traces = {};
        
        // Group by category for multiple traces (legend support)
        currentData.forEach(item => {
          if (!traces[item.category]) {
            traces[item.category] = {
              name: item.category,
              mode: 'markers+text',
              type: currentMode === '2d' ? 'scatter' : 'scatter3d',
              x: [],
              y: [],
              text: [],
              textposition: 'top center',
              marker: {
                size: currentMode === '2d' ? 8 : 5, // Smaller points in 3D for performance
                color: CATEGORY_COLORS[item.category] || '#fff',
                opacity: 0.8,
                line: {
                  width: 0.5,
                  color: 'rgba(255, 255, 255, 0.5)'
                }
              },
              textfont: {
                family: 'Syne, sans-serif',
                size: 10,
                color: 'rgba(255, 255, 255, 0.6)'
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
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          margin: { l: 0, r: 0, t: 0, b: 0 },
          showlegend: true,
          legend: {
            x: 1,
            y: 1,
            font: { color: '#fff', family: 'Syne, sans-serif' },
            bgcolor: 'rgba(0,0,0,0.5)'
          },
          font: { color: '#fff' }
        };

        let layout;
        if (currentMode === '2d') {
          layout = {
            ...commonLayout,
            xaxis: { showgrid: false, zeroline: false, showticklabels: false },
            yaxis: { showgrid: false, zeroline: false, showticklabels: false },
            hovermode: 'closest'
          };
        } else {
          layout = {
            ...commonLayout,
            scene: {
              xaxis: { showgrid: false, zeroline: false, showticklabels: false, title: '' },
              yaxis: { showgrid: false, zeroline: false, showticklabels: false, title: '' },
              zaxis: { showgrid: false, zeroline: false, showticklabels: false, title: '' },
              bgcolor: 'transparent',
              camera: {
                eye: { x: 1.5, y: 1.5, z: 1.5 }
              }
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
        loader.innerHTML = `<span style="color: var(--danger)">Render Error: ${err.message}</span>`;
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

  window.addEventListener('resize', () => {
    Plotly.Plots.resize(plotArea);
  });

  init();
})();
