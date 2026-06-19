import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  recoveryAttempts: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, recoveryAttempts: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    try {
      const api = (window as any).electronAPI;
      if (api?.logActivity) {
        api.logActivity('ui_error', `[${this.props.name || 'unknown'}] ${error.message}`);
      }
    } catch {}
  }

  private handleRetry = (): void => {
    const attempts = this.state.recoveryAttempts + 1;
    if (attempts >= 3) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, errorInfo: null, recoveryAttempts: attempts });
    this.props.onReset?.();
  };

  private handleGoHome = (): void => {
    window.location.hash = '#/';
    setTimeout(() => this.setState({ hasError: false, error: null, errorInfo: null }), 100);
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isRepeated = this.state.recoveryAttempts >= 2;

      return (
        <div dir="rtl" className="flex items-center justify-center min-h-[400px] p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {isRepeated ? 'تعذر تحميل هذا القسم' : 'حدث خطأ غير متوقع'}
            </h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {isRepeated
                ? 'نواجه مشكلة في تحميل هذا القسم. تم تسجيل المشكلة وسيتم حلها قريباً.'
                : `حدث خطأ في تحميل ${this.props.name || 'هذا القسم'}. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.`}
            </p>
            {this.state.error?.message && (
              <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <p className="text-xs text-slate-500 font-mono text-left" dir="ltr">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              {!isRepeated && (
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${this.state.recoveryAttempts > 0 ? 'animate-spin' : ''}`} />
                  إعادة المحاولة
                </button>
              )}
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors text-sm font-medium"
              >
                <Home className="w-4 h-4" />
                الصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
