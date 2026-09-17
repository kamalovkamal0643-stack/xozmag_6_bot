import { prisma } from '../database/connection.js';

export const CategoryModel = {
  list() {
    return prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  },

  create(data) {
    return prisma.category.create({ data });
  },

  update(id, data) {
    return prisma.category.update({ where: { id }, data });
  },

  async remove(id) {
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) return { removed: false, count };
    await prisma.category.delete({ where: { id } });
    return { removed: true, count: 0 };
  },
};

export const StoryModel = {
  listActive() {
    return prisma.story.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  },
};
