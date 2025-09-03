import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreejsUiLib } from './threejs-ui-lib';

describe('ThreejsUiLib', () => {
  let component: ThreejsUiLib;
  let fixture: ComponentFixture<ThreejsUiLib>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreejsUiLib]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreejsUiLib);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
