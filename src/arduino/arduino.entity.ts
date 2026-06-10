import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class sensor_data {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  date!: Date;

  @Column()
  distance!: number;

  @Column()
  delta!: number;
}
