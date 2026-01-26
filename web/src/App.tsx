import { KanbanBoard } from './components/board/KanbanBoard';
import { Header } from './components/layout/Header';
import { Toaster } from './components/ui/toaster';
import { KeyboardProvider } from './hooks/useKeyboard';
import { KeyboardShortcutsDialog } from './components/layout/KeyboardShortcutsDialog';
import { BulkActionsProvider } from './hooks/useBulkActions';

function App() {
  return (
    <KeyboardProvider>
      <BulkActionsProvider>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-6">
            <KanbanBoard />
          </main>
          <Toaster />
          <KeyboardShortcutsDialog />
        </div>
      </BulkActionsProvider>
    </KeyboardProvider>
  );
}

export default App;
