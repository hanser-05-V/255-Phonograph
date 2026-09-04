type AsyncFormStatusProps = {
  error?: string;
  errorId?: string;
  status?: string;
  statusId?: string;
};

export function AsyncFormStatus({
  error,
  errorId,
  status,
  statusId,
}: AsyncFormStatusProps) {
  return (
    <>
      {error ? <p className="admin-form-error" id={errorId} role="alert">{error}</p> : null}
      {status ? <p className="admin-form-success" id={statusId} role="status">{status}</p> : null}
    </>
  );
}
