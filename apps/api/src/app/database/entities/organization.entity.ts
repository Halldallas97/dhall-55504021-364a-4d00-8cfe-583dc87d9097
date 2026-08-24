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
import { TaskEntity } from './task.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'organizations' })
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  name: string;

  @Column({ name: 'parent_organization_id', type: 'text', nullable: true })
  parentOrganizationId: string | null;

  @ManyToOne(() => OrganizationEntity, (organization) => organization.children, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_organization_id' })
  parentOrganization: Relation<OrganizationEntity> | null;

  @OneToMany(() => OrganizationEntity, (organization) => organization.parentOrganization)
  children: Relation<OrganizationEntity[]>;

  @OneToMany(() => UserEntity, (user) => user.organization)
  users: Relation<UserEntity[]>;

  @OneToMany(() => TaskEntity, (task) => task.organization)
  tasks: Relation<TaskEntity[]>;
}
