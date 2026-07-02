import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Link, LinkService } from './link.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly svc = inject(LinkService);

  inputUrl = '';
  links = signal<Link[]>([]);
  newLink = signal<Link | null>(null);
  error = signal('');
  submitting = signal(false);

  ngOnInit(): void {
    this.loadLinks();
  }

  private loadLinks(): void {
    this.svc.getAll().subscribe({
      next: (data) => this.links.set(data),
    });
  }

  private isValidUrl(url: string): boolean {
    try {
      const { protocol } = new URL(url);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }

  submit(): void {
    const url = this.inputUrl.trim();
    if (!this.isValidUrl(url)) {
      this.error.set('Please enter a valid http(s) URL.');
      return;
    }
    this.error.set('');
    this.newLink.set(null);
    this.submitting.set(true);

    this.svc.create(url).subscribe({
      next: (link) => {
        this.newLink.set(link);
        this.inputUrl = '';
        this.submitting.set(false);
        this.loadLinks();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'Network or server error.');
        this.submitting.set(false);
      },
    });
  }
}
