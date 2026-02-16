import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";

const App = () => (
  <ErrorBoundary>
    <Index />
  </ErrorBoundary>
);

export default App;
