import { useEffect, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { DimensionBar } from '../components/common/DimensionBar';
import { getProjects, getProjectMetrics } from '../api/projects';

export function ClientPortalPage() {
  const [project, setProject] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProjects()
      .then(async (projects) => {
        // Backend already scopes /projects to the client's own project(s)
        const mine = projects[0];
        setProject(mine);
        if (mine) {
          const m = await getProjectMetrics(mine.id);
          setMetrics(m);
        }
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load your project'));
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Your Project</div>
          <h1>{project ? project.name : 'Loading…'}</h1>
        </div>
      </div>

      {error && <div className="callout">{error}</div>}

      {metrics && (
        <div className="card" style={{ maxWidth: 520 }}>
          <DimensionBar label="Time Progress" pct={metrics.metrics.timeProgressPct} />
          {metrics.metrics.materialUtilizationPct !== null && (
            <DimensionBar label="Material Utilization" pct={metrics.metrics.materialUtilizationPct} />
          )}
          <DimensionBar
            label="Probability of On-Time Completion"
            pct={metrics.metrics.probabilityOnTimeCompletionPct}
            thresholds={{ amber: 101, stop: 102 }}
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {metrics.metrics.timeLeftDays} days remaining
          </div>
        </div>
      )}
    </AppShell>
  );
}
