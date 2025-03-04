import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserProductViewsService } from './user-product-views.service';
import { UserProductViewsController } from './user-product-views.controller';
import { UserProductView, UserProductViewSchema } from './schemas/user-product-view.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: UserProductView.name, schema: UserProductViewSchema },
        ]),
    ],
    controllers: [UserProductViewsController],
    providers: [UserProductViewsService],
    exports: [UserProductViewsService],
})
export class UserProductViewsModule { } 