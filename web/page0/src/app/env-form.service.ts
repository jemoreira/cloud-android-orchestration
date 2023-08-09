import { Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RuntimeService } from './runtime.service';
import {
  catchError,
  combineLatestWith,
  map,
  of,
  scan,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { HostService } from './host.service';

interface EnvFormInitAction {
  type: 'init';
}

type EnvFormAction = EnvFormInitAction;

interface EnvForm {
  groupName: string;
  runtime: string;
  zone: string;
  host: string;
}

@Injectable({
  providedIn: 'root',
})
export class EnvFormService {
  constructor(
    private formBuilder: FormBuilder,
    private runtimeService: RuntimeService,
    private hostService: HostService
  ) {}

  private envFormAction$ = new Subject<EnvFormAction>();

  private envForm$ = this.envFormAction$.pipe(
    startWith({ type: 'init' } as EnvFormInitAction),
    scan((form, action) => {
      if (action.type === 'init') {
        return form;
      }
      return form;
    }, this.toFormGroup(this.getInitEnvSetting()))
  );

  toFormGroup(setting: EnvForm) {
    const { groupName, runtime, zone, host } = setting;

    return this.formBuilder.group({
      groupName: [groupName, Validators.required],
      runtime: [runtime, Validators.required],
      zone: [zone, Validators.required],
      host: [host, Validators.required],
    });
  }

  getEnvForm() {
    return this.envForm$;
  }

  private getInitEnvSetting(): EnvForm {
    const storedSetting = {} as EnvForm;
    return {
      groupName: storedSetting?.groupName ?? '',
      runtime: storedSetting?.runtime ?? '',
      zone: storedSetting?.zone ?? '',
      host: storedSetting?.host ?? '',
    };
  }

  runtimes$ = this.runtimeService.getRuntimes();

  private selectedRuntime$ = this.envForm$.pipe(
    switchMap((form) => {
      return form.controls.runtime.valueChanges.pipe(
        map((alias) => alias ?? ''),
        tap((alias) => console.log(`selected runtime: ${alias}`)),
        tap(() => {
          form.controls.zone.setValue('');
        }),
        switchMap((alias: string) =>
          this.runtimeService.getRuntimeByAlias(alias)
        ),
        catchError((error) => {
          return of();
        })
      );
    }),
    shareReplay(1)
  );

  zones$ = this.selectedRuntime$.pipe(
    map((runtime) => runtime?.zones || []),
    tap((zones) => console.log('zones: ', zones.length))
  );

  private selectedZone$ = this.envForm$.pipe(
    switchMap((form) =>
      form.controls.zone.valueChanges.pipe(
        map((zone) => zone ?? ''),
        tap((zone) => console.log('selected zone: ', zone)),
        tap(() => {
          form.controls.host.setValue('');
        })
      )
    ),
    shareReplay(1)
  );

  hosts$ = this.selectedZone$.pipe(
    combineLatestWith(this.selectedRuntime$),
    switchMap(([zone, runtime]) => {
      if (!runtime) {
        return of([]);
      }
      return this.hostService.getHostsByZone(runtime.alias, zone);
    }),
    tap((hosts) => console.log('hosts: ', hosts.length))
  );

  getSelectedRuntime() {
    return this.envForm$.pipe(map((form) => form.value.runtime));
  }

  getValue() {
    return this.envForm$.pipe(
      switchMap((form) => {
        const { runtime, zone, groupName, host } = form.value;
        if (!runtime || !zone || !groupName || !host) {
          throw new Error(
            'Group name, runtime, zone, host should be specified'
          );
        }

        return this.hostService.getHost(runtime, zone, host).pipe(
          map((host) => {
            if (!host) {
              throw new Error(`Invalid host`);
            }
            return {
              groupName,
              hostUrl: host.url,
              runtime: host.runtime,
            };
          })
        );
      })
    );
  }
}
