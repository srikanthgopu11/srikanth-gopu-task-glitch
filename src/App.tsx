import { Alert, Avatar, Box, Button, CircularProgress, Container, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import MetricsBar from '@/components/MetricsBar';
import TaskTable from '@/components/TaskTable';
import UndoSnackbar from '@/components/UndoSnackbar';
import { useCallback, useMemo, useState } from 'react';
import { UserProvider, useUser } from '@/context/UserContext';
import { TasksProvider, useTasksContext } from '@/context/TasksContext';
import ChartsDashboard from '@/components/ChartsDashboard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ActivityLog, { ActivityItem } from '@/components/ActivityLog';
import { downloadCSV, toCSV } from '@/utils/csv';
import type { Task } from '@/types';
import {
  computeAverageROI,
  computePerformanceGrade,
  computeRevenuePerHour,
  computeTimeEfficiency,
  computeTotalRevenue,
} from '@/utils/logic';

function AppContent() {
  const { loading, error, metrics, derivedSorted, addTask, updateTask, deleteTask, undoDelete, lastDeleted, clearLastDeleted } = useTasksContext();
  
  // FIXED BUG 2: Close snackbar and clear state
  const handleCloseUndo = useCallback(() => {
    clearLastDeleted();
  }, [clearLastDeleted]);

  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState<string>('All');
  const [fPriority, setFPriority] = useState<string>('All');
  const { user } = useUser();
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const createActivity = useCallback((type: ActivityItem['type'], summary: string): ActivityItem => ({
    id: crypto.randomUUID(),
    ts: Date.now(),
    type,
    summary,
  }), []);

  const filtered = useMemo(() => {
    return derivedSorted.filter(t => {
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (fStatus !== 'All' && t.status !== fStatus) return false;
      if (fPriority !== 'All' && t.priority !== fPriority) return false;
      return true;
    });
  }, [derivedSorted, q, fStatus, fPriority]);

  const handleAdd = useCallback((payload: Omit<Task, 'id'>) => {
    addTask(payload);
    setActivity(prev => [createActivity('add', `Added: ${payload.title}`), ...prev].slice(0, 50));
  }, [addTask, createActivity]);

  const handleUpdate = useCallback((id: string, patch: Partial<Task>) => {
    updateTask(id, patch);
    setActivity(prev => [createActivity('update', `Updated: ${id}`), ...prev].slice(0, 50));
  }, [updateTask, createActivity]);

  const handleDelete = useCallback((id: string) => {
    deleteTask(id);
    setActivity(prev => [createActivity('delete', `Deleted: ${id}`), ...prev].slice(0, 50));
  }, [deleteTask, createActivity]);

  const handleUndo = useCallback(() => {
    undoDelete();
    setActivity(prev => [createActivity('undo', 'Undo delete'), ...prev].slice(0, 50));
  }, [undoDelete, createActivity]);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h3" fontWeight={700} gutterBottom>TaskGlitch</Typography>
              <Typography variant="body1" color="text.secondary">Welcome, {user.name}.</Typography>
            </Box>
            <Button variant="outlined" onClick={() => downloadCSV('tasks.csv', toCSV(filtered))}>Export CSV</Button>
          </Stack>
          
          {loading ? <CircularProgress sx={{ m: 'auto' }} /> : (
            <>
              <MetricsBar metricsOverride={{
                totalRevenue: computeTotalRevenue(filtered),
                totalTimeTaken: filtered.reduce((s, t) => s + t.timeTaken, 0),
                timeEfficiencyPct: computeTimeEfficiency(filtered),
                revenuePerHour: computeRevenuePerHour(filtered),
                averageROI: computeAverageROI(filtered),
                performanceGrade: computePerformanceGrade(computeAverageROI(filtered)),
              }} />
              <Stack direction="row" spacing={2}>
                <TextField placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} fullWidth />
              </Stack>
              <TaskTable tasks={filtered} onAdd={handleAdd} onUpdate={handleUpdate} onDelete={handleDelete} />
              <ChartsDashboard tasks={filtered} />
              <ActivityLog items={activity} />
            </>
          )}
          <UndoSnackbar open={!!lastDeleted} onClose={handleCloseUndo} onUndo={handleUndo} />
        </Stack>
      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <UserProvider>
      <TasksProvider>
        <AppContent />
      </TasksProvider>
    </UserProvider>
  );
}