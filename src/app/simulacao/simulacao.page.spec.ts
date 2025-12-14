import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SimulacaoPage } from './simulacao.page';

describe('SimulacaoPage', () => {
  let component: SimulacaoPage;
  let fixture: ComponentFixture<SimulacaoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SimulacaoPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SimulacaoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
