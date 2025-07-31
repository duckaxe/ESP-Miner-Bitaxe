import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SystemService } from 'src/app/services/system.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'autotune',
  templateUrl: './autotune.component.html',
  styleUrls: ['./autotune.component.scss']
})
export class AutotuneComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private systemService: SystemService,
    private toastr: ToastrService
  ) {}

  public autotuneForm!: FormGroup;
  public autotuneInfo: any = {};

  ngOnInit() {
    this.autotuneForm = this.fb.group({
      power_limit: [20, [Validators.required, Validators.min(1)]],
      fan_limit: [75, [Validators.required, Validators.min(1)]],
      max_volt_asic: [1400, [Validators.required, Validators.min(1)]],
      max_freq_asic: [1000, [Validators.required, Validators.min(1)]],
      max_temp_asic: [65, [Validators.required, Validators.min(1)]],
      auto_tune: [false],
      osh_pow_limit: [0.2],
      osh_fan_limit: [5],
      vf_ratio_max: [2.2],
      vf_ratio_min: [1.76],
      power_limit_toggle:[false],
    });

    // Load autotune settings from API and patch the form if available
    this.systemService.getAutotune().subscribe({
      next: (autotune) => {
        this.autotuneInfo = autotune;
        this.autotuneForm.patchValue({
          power_limit: autotune.power_limit ?? 20,
          fan_limit: autotune.fan_limit ?? 75,
          max_volt_asic: autotune.max_volt_asic ?? 1400,
          max_freq_asic: autotune.max_freq_asic ?? 1000,
          max_temp_asic: autotune.max_temp_asic ?? 65,
          auto_tune: autotune.auto_tune,
          osh_pow_limit: autotune.osh_pow_limit ?? 0.2,
          osh_fan_limit: autotune.osh_fan_limit ?? 5,
          vf_ratio_max: autotune.vf_ratio_max ?? 2.2,
          vf_ratio_min: autotune.vf_ratio_min ?? 1.76,
        });
      },
      error: () => {
        this.toastr.error('Failed to load autotune settings');
      }
    });
  }

  public updateAutotune() {
    if (!this.autotuneForm.valid) return;
    this.systemService.updateAutotune(this.autotuneForm.value).subscribe({
      next: () => this.toastr.success('Autotune settings saved!'),
      error: (err: HttpErrorResponse) => {
        this.toastr.error(`Could not save autotune settings. ${err.message}`);
      }
    });
  }
}