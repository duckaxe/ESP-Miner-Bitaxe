import { HttpErrorResponse, HttpEventType, HttpClient, HttpResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { map, Observable, shareReplay, startWith } from 'rxjs';
import { GithubUpdateService } from 'src/app/services/github-update.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SystemService } from 'src/app/services/system.service';
import { eASICModel } from 'src/models/enum/eASICModel';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {

  public form!: FormGroup;

  public firmwareUpdateProgress: number | null = null;
  public websiteUpdateProgress: number | null = null;


  public eASICModel = eASICModel;
  public ASICModel!: eASICModel;

  public checkLatestRelease: boolean = false;
  public latestRelease$: Observable<any>;

  public info$: Observable<any>;

  constructor(
    private fb: FormBuilder,
    private systemService: SystemService,
    private toastr: ToastrService,
    private toastrService: ToastrService,
    private loadingService: LoadingService,
    private githubUpdateService: GithubUpdateService,
    private http: HttpClient,
  ) {
    this.latestRelease$ = this.githubUpdateService.getReleases().pipe(map(releases => {
      return releases[0];
    }));

    this.info$ = this.systemService.getInfo().pipe(shareReplay({refCount: true, bufferSize: 1}))
  }

  public isUpdateAvailable(deviceVersion: string, releaseName: string) {
    return this.checkVersion(releaseName.substring(1), deviceVersion) === 1;
  }

  // https://codereview.stackexchange.com/a/236656
  private checkVersion(a: string, b: string): 1 | -1 | 0 {
    const x = a.split('.').map(e => parseInt(e, 10));
    const y = b.split('.').map(e => parseInt(e, 10));

    for (const i in x) {
      y[i] = y[i] || 0;

      if (x[i] === y[i]) {
        continue;
      } else if (x[i] > y[i]) {
        return 1;
      } else {
        return -1;
      }
    }

    return y.length > x.length ? -1 : 0;
  }

  public otaAutoUpdate(assets: any) {
    const espBinAsset = assets.filter((x: any) => x.name === 'esp-miner.bin');
    const wwwBinAsset = assets.filter((x: any) => x.name === 'www.bin');

    if (!espBinAsset.length) {
      this.toastrService.error('No esp-miner.bin file found', 'Error');
      return;
    }

    if (!wwwBinAsset.length) {
      this.toastrService.error('No www.bin file found', 'Error');
      return;
    }

    const espBinUrl = espBinAsset[0].browser_download_url;
    const wwwBinUrl = wwwBinAsset[0].browser_download_url;

    this.http.get(
      'https://corsproxy.io/?url=' + wwwBinUrl, { responseType: 'blob', observe: 'response'}
    ).subscribe((response: HttpResponse<Blob>) => {
      // For test purposes only otaWWWUpdate
      this.otaWWWUpdate(response.body as Blob);
      // ... otaUpdate
    });
  }

  public updateSystem() {
    const form = this.form.getRawValue();

    form.frequency = parseInt(form.frequency);
    form.coreVoltage = parseInt(form.coreVoltage);

    // bools to ints
    form.flipscreen = form.flipscreen == true ? 1 : 0;
    form.invertscreen = form.invertscreen == true ? 1 : 0;
    form.autofanspeed = form.autofanspeed == true ? 1 : 0;

    if (form.stratumPassword === '*****') {
      delete form.stratumPassword;
    }

    this.systemService.updateSystem(undefined, form)
      .pipe(this.loadingService.lockUIUntilComplete())
      .subscribe({
        next: () => {
          this.toastr.success('Success!', 'Saved.');
        },
        error: (err: HttpErrorResponse) => {
          this.toastr.error('Error.', `Could not save. ${err.message}`);
        }
      });
  }

  otaUpdate(file: Blob) {
    this.systemService.performOTAUpdate(file)
      .pipe(this.loadingService.lockUIUntilComplete())
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.firmwareUpdateProgress = Math.round((event.loaded / (event.total as number)) * 100);
          } else if (event.type === HttpEventType.Response) {
            if (event.ok) {
              this.toastrService.success('Firmware updated', 'Success!');

            } else {
              this.toastrService.error(event.statusText, 'Error');
            }
          }
          else if (event instanceof HttpErrorResponse)
          {
            this.toastrService.error(event.error, 'Error');
          }
        },
        error: (err) => {
          this.toastrService.error(err.error, 'Error');
        },
        complete: () => {
          this.firmwareUpdateProgress = null;
        }
      });
  }

  otaWWWUpdate(file: Blob) {
    this.systemService.performWWWOTAUpdate(file)
      .pipe(
        this.loadingService.lockUIUntilComplete(),
      ).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.websiteUpdateProgress = Math.round((event.loaded / (event.total as number)) * 100);
          } else if (event.type === HttpEventType.Response) {
            if (event.ok) {
              this.toastrService.success('Website updated', 'Success!');
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              this.toastrService.error(event.statusText, 'Error');
            }
          }
          else if (event instanceof HttpErrorResponse)
          {
            const errorMessage = event.error?.message || event.message || 'Unknown error occurred';
            this.toastrService.error(errorMessage, 'Error');
          }
        },
        error: (err) => {
          const errorMessage = err.error?.message || err.message || 'Unknown error occurred';
          this.toastrService.error(errorMessage, 'Error');
        },
        complete: () => {
          this.websiteUpdateProgress = null;
        }
      });
  }

  public restart() {
    this.systemService.restart().subscribe(res => {

    });
    this.toastr.success('Success!', 'Bitaxe restarted');
  }
}
