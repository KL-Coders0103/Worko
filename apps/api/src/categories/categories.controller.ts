import {
  Controller,
  Get,
  Param,
  Version,
} from '@nestjs/common';

import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get()
  @Version('1')
  getActiveCategories() {
    return this.categoriesService.getActiveCategories();
  }

  @Get(':categoryId')
  @Version('1')
  getCategory(
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.getActiveCategoryById(
      categoryId,
    );
  }

  @Get(':categoryId/skills')
  @Version('1')
  getSkills(
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.getActiveSkills(
      categoryId,
    );
  }
}