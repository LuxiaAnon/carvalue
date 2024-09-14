import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from './users.service';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async signup(email: string, password: string) {
    // See if email is in use
    const existingUsers = await this.usersService.find(email);
    if (existingUsers.length) {
      throw new BadRequestException('Email in use');
    }
    // hash the user's password
    // generate a salt
    const salt = randomBytes(8).toString('hex');

    // hash the password along with our new salt
    const hash = (await scrypt(password, salt, 32)) as Buffer;

    //joining the hashed result and the salt together
    const result = salt + '.' + hash.toString('hex');

    // create a new user and save it
    const user = await this.usersService.create(email, result);

    // return the user
    return user;
  }

  async signin(email: string, password: string) {
    // find the user
    const [user] = await this.usersService.find(email);

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }
    // ensure the password is correct
    const [salt, storedHash] = user.password.split('.');
    const hash = (await scrypt(password, salt, 32)) as Buffer;

    if (storedHash !== hash.toString('hex')) {
      throw new BadRequestException('Invalid credentials');
    }
    return user;
  }
}
