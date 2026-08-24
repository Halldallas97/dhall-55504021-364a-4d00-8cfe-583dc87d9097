import { Injectable } from '@nestjs/common';
import { User } from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data'; 

@Injectable()
export class AppService {
  getData(): User {
    return { 
      id: 1, 
      email: 'email', 
      name: 'name', 
      password: 'password'
     };
  }
}
