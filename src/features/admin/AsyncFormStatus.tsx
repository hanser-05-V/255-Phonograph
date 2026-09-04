import {useEffect, useRef} from 'react';

type AsyncFormStatusProps = {
  error?: string;
  errorId?: string;
  focusError?: boolean;
  status?: string;
  statusId?: string;
};

export function AsyncFormStatus({
  error,
  errorId,
  focusError = false,
  status,
  statusId,
}: AsyncFormStatusProps) {
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error && focusError) errorRef.current?.focus();
  }, [error, focusError]);

  return (
    <>
      {error ? (
        <p
          className="admin-form-error"
          id={errorId}
          ref={errorRef}
          role="alert"
          tabIndex={focusError ? -1 : undefined}
        >
          {error}
        </p>
      ) : null}
      {status ? <p className="admin-form-success" id={statusId} role="status">{status}</p> : null}
    </>
  );
}
