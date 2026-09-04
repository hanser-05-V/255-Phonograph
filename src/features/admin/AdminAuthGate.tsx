import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {adminApi} from '../../api/admin-api';
import {ApiError} from '../../api/http';
import {AdminLoginPage, type AdminLoginMode} from './AdminLoginPage';

type AuthenticatedAdmin = {
  logout: (signal?: AbortSignal) => Promise<void>;
};

type AdminAuthGateProps = {
  children: (session: AuthenticatedAdmin) => ReactNode;
};

type AuthStage = 'checking' | AdminLoginMode | 'authenticated';

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

export function AdminAuthGate({children}: AdminAuthGateProps) {
  const [stage, setStage] = useState<AuthStage>('checking');
  const [checkFailed, setCheckFailed] = useState(false);
  const checkRequestRef = useRef<AbortController>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const checkStatus = useCallback(() => {
    checkRequestRef.current?.abort();
    const controller = new AbortController();
    checkRequestRef.current = controller;
    setCheckFailed(false);
    setStage('checking');

    void adminApi.getAuthStatus(controller.signal).then((status) => {
      if (controller.signal.aborted) {
        return;
      }
      if (status.authenticated) {
        setStage('authenticated');
      } else {
        setStage(status.needsSetup ? 'setup' : 'login');
      }
    }).catch((error: unknown) => {
      if (controller.signal.aborted || isAbortError(error)) {
        return;
      }
      if (error instanceof ApiError && error.status === 401) {
        setStage('login');
      } else {
        setCheckFailed(true);
      }
    });
  }, []);

  useEffect(() => {
    checkStatus();
    return () => checkRequestRef.current?.abort();
  }, [checkStatus]);

  useEffect(() => {
    if (checkFailed) {
      alertRef.current?.focus();
    }
  }, [checkFailed]);

  async function authenticate(password: string, signal?: AbortSignal) {
    try {
      if (stage === 'setup') {
        await adminApi.setup(password, signal);
      } else {
        await adminApi.login(password, signal);
      }
      if (!signal?.aborted) {
        setStage('authenticated');
      }
    } catch (error) {
      if (!signal?.aborted && error instanceof ApiError && error.status === 401) {
        setStage('login');
      }
      throw error;
    }
  }

  async function logout(signal?: AbortSignal) {
    await adminApi.logout(signal);
    if (!signal?.aborted) {
      setStage('login');
    }
  }

  if (stage === 'checking') {
    if (checkFailed) {
      return (
        <div className="admin-service-error" ref={alertRef} role="alert" tabIndex={-1}>
          <p>无法连接本地管理服务</p>
          <button onClick={checkStatus} type="button">重试</button>
        </div>
      );
    }
    return <p className="admin-auth-status" role="status">正在检查管理会话…</p>;
  }

  if (stage === 'setup' || stage === 'login') {
    return <AdminLoginPage mode={stage} onSubmit={authenticate} />;
  }

  return (
    <>
      <p className="admin-visually-hidden" role="status">管理会话有效</p>
      {children({logout})}
    </>
  );
}
