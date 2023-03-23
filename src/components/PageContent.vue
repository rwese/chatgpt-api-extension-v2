<template>
  <img :src="imageUrl" height="45" alt="" />
  <h1>
    <slot></slot>
  </h1>
</template>

<script setup lang="ts">
import logo from "~/assets/logo.png";

const imageUrl = new URL(logo, import.meta.url).href;

</script>

<style>
h1 {
  margin: 5px;
}
</style>
