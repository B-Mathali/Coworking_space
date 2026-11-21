import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/** Point d'accès unique à l'API Stripe ; traduit ses erreurs en erreurs HTTP lisibles. */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private client: Stripe | null = null;

  constructor(private readonly config: ConfigService) {}

  get stripe(): Stripe {
    if (!this.client) {
      const key = this.config.get<string>('stripe.secretKey');
      if (!key) {
        throw new ServiceUnavailableException(
          "Le paiement en ligne n'est pas configuré (STRIPE_SECRET_KEY manquant).",
        );
      }
      this.client = new Stripe(key);
    }
    return this.client;
  }

  createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
    return this.call('création du paiement', () => this.stripe.checkout.sessions.create(params));
  }

  retrieveSession(id: string) {
    return this.call('lecture du paiement', () => this.stripe.checkout.sessions.retrieve(id));
  }

  /** Session + PaymentIntent + Charge, pour lire la carte utilisée. */
  retrieveSessionWithCharge(id: string) {
    return this.call('lecture du paiement', () =>
      this.stripe.checkout.sessions.retrieve(id, { expand: ['payment_intent.latest_charge'] }),
    );
  }

  /** Ferme une session encore ouverte (annulation / délai dépassé). Sans effet si déjà terminée. */
  async expireSession(id: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(id);
      if (session.status === 'open') await this.stripe.checkout.sessions.expire(id);
    } catch (e) {
      this.logger.warn(`Impossible d'expirer la session ${id} : ${(e as Error).message}`);
    }
  }

  refund(paymentIntentId: string) {
    return this.call('remboursement', () =>
      this.stripe.refunds.create({ payment_intent: paymentIntentId }),
    );
  }

  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string) {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  private async call<T>(action: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Stripe.errors.StripeError) {
        this.logger.error(`Stripe (${action}) : ${e.message}`);
        throw new BadGatewayException(`Erreur Stripe lors de la ${action} : ${e.message}`);
      }
      throw e;
    }
  }
}
