import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TaskEntity } from './task.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'organizations' })
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'parent_organization_id', type: 'text', nullable: true })
  parentOrganizationId: string | null;

  @ManyToOne(() => OrganizationEntity, (organization) => organization.children, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_organization_id' })
  parentOrganization: OrganizationEntity | null;

  @OneToMany(() => OrganizationEntity, (organization) => organization.parentOrganization)
  children: OrganizationEntity[];

  @OneToMany(() => UserEntity, (user) => user.organization)
  users: UserEntity[];

  @OneToMany(() => TaskEntity, (task) => task.organization)
  tasks: TaskEntity[];
}
