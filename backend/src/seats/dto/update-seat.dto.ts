import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSeatDto } from './create-seat.dto';

/** On ne change pas une place de salle : seuls label, position et état sont modifiables. */
export class UpdateSeatDto extends PartialType(OmitType(CreateSeatDto, ['spaceId'] as const)) {}
