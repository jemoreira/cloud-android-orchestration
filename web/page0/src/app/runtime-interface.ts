export interface Runtime {
  alias: string;
  runtime_type?: 'local' | 'on-premise' | 'cloud';
  url: string;
  hosts?: string[]; // Full urls towards host orchestrators
  status: 'valid' | 'error' | 'loading';
}

export interface RuntimeAdditionalInfo {
  runtime_type: 'local' | 'on-premise' | 'cloud';
  hosts: string[];
}

export enum RuntimesStatus {
  initializing = 'initializing',
  refreshing = 'refreshing',
  registering = 'registering',
  register_error = 'register_error',
  done = 'done',
}