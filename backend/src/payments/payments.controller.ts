import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  RawBodyRequest,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckoutDto, ConfirmPaymentDto } from './dto/checkout.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  /** Devise et TVA, pour que le frontend affiche une estimation identique au montant facturé. */
  @Get('config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  billingConfig() {
    return {
      currency: this.config.get<string>('billing.currency'),
      vatRate: this.config.get<number>('billing.vatRate'),
    };
  }

  /** Renvoie l'URL de la page de paiement Stripe vers laquelle rediriger l'utilisateur. */
  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.payments.createCheckout(user, dto.reservationId);
  }

  @Post('confirm')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  confirm(@CurrentUser() user: AuthUser, @Body() dto: ConfirmPaymentDto) {
    return this.payments.confirm(user, dto.sessionId);
  }

  @Get('reservations/:id/invoice')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async invoice(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const { pdf, filename } = await this.payments.invoice(user, id);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
      length: pdf.length,
    });
  }

  /** Appelé par Stripe (pas de JWT) : l'authenticité est garantie par la signature. */
  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    return this.payments.handleWebhook(req.rawBody, signature);
  }
}
