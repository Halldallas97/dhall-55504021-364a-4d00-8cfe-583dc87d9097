import type { Role } from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { TaskEntity } from './task.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;
  //storing the salt to ensure that users with the same password have different hashes, preventing rainbow table attacks
  @Column({ name: 'password_salt', select: false })
  passwordSalt: string;

  @Column({
    type: 'simple-enum',
    enum: ['owner', 'admin', 'viewer'] satisfies Role[],
    default: 'viewer',
  })
  role: Role;

  @Column({ name: 'organization_id', type: 'text' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, (organization) => organization.users, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Relation<OrganizationEntity>;

  @OneToMany(() => TaskEntity, (task) => task.createdByUser)
  createdTasks: Relation<TaskEntity[]>;

  @OneToMany(() => TaskEntity, (task) => task.assignee)
  assignedTasks: Relation<TaskEntity[]>;
}
